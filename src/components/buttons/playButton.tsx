import PropTypes from "prop-types";
import React from "react";

import Button, {
	type ButtonProps,
	type ButtonPropsSizeOverrides,
} from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

import { playAudio } from "@/utils/store/audioPlayback";
import {
	type BaseItemDto,
	type BaseItemDtoQueryResult,
	BaseItemKind,
	ItemFields,
	MediaProtocol,
	type PlaybackInfoResponse,
	SortOrder,
	type UserItemDataDto,
} from "@jellyfin/sdk/lib/generated-client";
import { getDlnaApi } from "@jellyfin/sdk/lib/utils/api/dlna-api";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getPlaylistsApi } from "@jellyfin/sdk/lib/utils/api/playlists-api";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api/tv-shows-api";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useSnackbar } from "notistack";

import useQueue, { setQueue } from "@/utils/store/queue";

import { playItem, usePlaybackDataLoadStore } from "@/utils/store/playback";

import type PlayResult from "@//utils/types/playResult";
import { getRuntimeCompact } from "@/utils/date/time";
import getSubtitle from "@/utils/methods/getSubtitles";
import playbackProfile from "@/utils/playback-profiles";
import { axiosClient, useApiInContext } from "@/utils/store/api";
import type IntroMediaInfo from "@/utils/types/introMediaInfo";
import { getMediaInfoApi } from "@jellyfin/sdk/lib/utils/api/media-info-api";
import type { SxProps } from "@mui/material";
import type { AxiosResponse } from "axios";

type PlayButtonProps = {
	item: BaseItemDto;
	itemId: string;
	itemUserData: UserItemDataDto;
	userId: string;
	itemType: BaseItemKind;
	currentAudioTrack: number;
	currentVideoTrack: number;
	currentSubTrack: number | "nosub";
	className: string;
	sx: SxProps;
	buttonProps: ButtonProps;
	iconOnly: boolean;
	audio: boolean;
	size: ButtonPropsSizeOverrides;
	playlistItem: BaseItemDto;
	playlistItemId: string;
	trackIndex: number;
};

const PlayButton = ({
	item,
	itemId,
	itemUserData,
	userId,
	itemType,
	currentAudioTrack,
	currentSubTrack,
	currentVideoTrack,
	className,
	sx,
	buttonProps,
	iconOnly,
	audio = false,
	size = "large",
	playlistItem,
	playlistItemId = "",
	trackIndex,
}: PlayButtonProps) => {
	const api = useApiInContext((s) => s.api);

	const navigate = useNavigate();
	const setPlaybackDataLoading = usePlaybackDataLoadStore(
		(state) => state.setisPending,
	);

	const { enqueueSnackbar } = useSnackbar();

	const itemQuery = useMutation({
		mutationKey: ["playButton", itemId, userId],
		mutationFn: async () => {
			setPlaybackDataLoading(true);
			let result: undefined | AxiosResponse<BaseItemDtoQueryResult, any>;
			let mediaSource: undefined | AxiosResponse<PlaybackInfoResponse, any>;
			let introInfo: undefined | AxiosResponse<IntroMediaInfo, any>;
			const indexNumber = item.IndexNumber ? item.IndexNumber - 1 : 0;
			if (playlistItem) {
				result = await getPlaylistsApi(api).getPlaylistItems({
					userId: userId,
					playlistId: playlistItemId,
				});
			} else {
				switch (itemType) {
					case BaseItemKind.Episode:
						result = await getTvShowsApi(api).getEpisodes({
							seriesId: item.SeriesId,
							fields: [
								ItemFields.MediaSources,
								ItemFields.MediaStreams,
								ItemFields.Overview,
							],
							enableUserData: true,
							userId: userId,
							seasonId: item.SeasonId,
							// startItemId: item.Id,
						});
						mediaSource = await getMediaInfoApi(api).getPostedPlaybackInfo({
							audioStreamIndex: currentAudioTrack,
							subtitleStreamIndex:
								currentSubTrack === "nosub" ? -1 : currentSubTrack,
							itemId: result.data.Items?.[indexNumber].Id,
							startTimeTicks:
								result.data.Items?.[indexNumber].UserData
									?.PlaybackPositionTicks,
							userId: userId,
							mediaSourceId:
								result.data.Items?.[indexNumber].MediaSources?.[0].Id,
							playbackInfoDto: {
								DeviceProfile: playbackProfile,
							},
						});
						try {
							introInfo = (
								await axiosClient.get(
									`${api.basePath}/Episode/${result.data.Items?.[indexNumber]?.Id}/IntroTimestamps`,
									{
										headers: {
											Authorization: `MediaBrowser Token=${api.accessToken}`,
										},
									},
								)
							)?.data;
						} catch (error) {
							console.error(error);
						}
						try {
							introInfo = (
								await axiosClient.get(
									`${api.basePath}/Episode/${result.data.Items?.[0]?.Id}/IntroSkipperSegments`,
									{
										headers: {
											Authorization: `MediaBrowser Token=${api.accessToken}`,
										},
									},
								)
							)?.data;
						} catch (error) {
							console.error(error);
						}
						break;
					case BaseItemKind.Series:
						result = await getTvShowsApi(api).getEpisodes({
							seriesId: itemId,
							fields: [
								ItemFields.MediaSources,
								ItemFields.MediaStreams,
								ItemFields.Overview,
							],
							enableUserData: true,
							userId: userId,
						});
						mediaSource = await getMediaInfoApi(api).getPostedPlaybackInfo({
							audioStreamIndex: currentAudioTrack,
							subtitleStreamIndex:
								currentSubTrack === "nosub" ? -1 : currentSubTrack,
							itemId: result.data.Items?.[0].Id,
							startTimeTicks:
								result.data.Items?.[0].UserData?.PlaybackPositionTicks,
							userId: userId,
							mediaSourceId: result.data.Items?.[0].MediaSources?.[0].Id,
							playbackInfoDto: {
								DeviceProfile: playbackProfile,
							},
						});
						try {
							introInfo = (
								await axiosClient.get(
									`${api.basePath}/Episode/${result.data.Items?.[0]?.Id}/IntroSkipperSegments`,
									{
										headers: {
											Authorization: `MediaBrowser Token=${api.accessToken}`,
										},
									},
								)
							)?.data;
						} catch (error) {
							console.error(error);
						}
						break;
					case BaseItemKind.Playlist:
						result = await getPlaylistsApi(api).getPlaylistItems({
							userId: userId,
							playlistId: playlistItemId,
						});
						break;
					case BaseItemKind.MusicAlbum:
						result = await getItemsApi(api).getItems({
							parentId: itemId,
							userId: userId,
							fields: [ItemFields.MediaSources, ItemFields.MediaStreams],
							sortOrder: [SortOrder.Ascending],
							sortBy: ["IndexNumber"],
						});
						break;
					case BaseItemKind.MusicArtist:
						result = await getItemsApi(api).getItems({
							artistIds: [itemId],
							recursive: true,
							includeItemTypes: [BaseItemKind.Audio],
							userId: userId,
							fields: [ItemFields.MediaSources, ItemFields.MediaStreams],
							sortOrder: [SortOrder.Ascending],
							sortBy: ["PremiereDate", "ProductionYear", "SortName"],
						});
						break;
					case BaseItemKind.BoxSet:
						result = await getItemsApi(api).getItems({
							parentId: itemId,
							userId,
							fields: [ItemFields.MediaSources, ItemFields.MediaStreams],
							sortOrder: [SortOrder.Ascending],
							sortBy: ["IndexNumber"],
						});
						break;
					default:
						result = await getItemsApi(api).getItems({
							ids: [itemId],
							userId: userId,
							fields: [ItemFields.MediaSources, ItemFields.MediaStreams],
							sortOrder: [SortOrder.Ascending],
							sortBy: ["IndexNumber"],
						});
						mediaSource = await getMediaInfoApi(api).getPostedPlaybackInfo({
							audioStreamIndex: currentAudioTrack,
							subtitleStreamIndex:
								currentSubTrack === "nosub" ? -1 : currentSubTrack,
							itemId: itemId,
							startTimeTicks:
								result.data.Items?.[0].UserData?.PlaybackPositionTicks,
							userId: userId,
							mediaSourceId: result.data.Items?.[0].MediaSources?.[0].Id,
							playbackInfoDto: {
								DeviceProfile: playbackProfile,
							},
						});
						break;
				}
			}
			return { item: result?.data, mediaSource: mediaSource?.data, introInfo };
		},
		onSuccess: (result: PlayResult | null) => {
			if (trackIndex) {
				// Playlist Playback
				enqueueSnackbar("Playlist playback is WIP", { variant: "info" });
			} else if (audio) {
				// Album/Individual audio track playback
				const urlOptions = {
					deviceId: api?.deviceInfo.id,
					userId,
					api_key: api?.accessToken,
				};
				const urlParams = new URLSearchParams(urlOptions).toString();

				const playbackUrl = `${api.basePath}/Audio/${result?.item.Items[0].Id}/universal?${urlParams}`;
				playAudio(playbackUrl, result?.item.Items[0], undefined);
				setQueue(result?.item.Items ?? [], 0);
			} else {
				const episodeIndex = item.IndexNumber ? item.IndexNumber - 1 : 0;
				// Creates a queue containing all Episodes for a particular season(series) or collection of movies
				const queue = result?.item.Items;
				let itemName = item.Name;
				let episodeTitle = "";
				if (result?.item.Items?.[episodeIndex].SeriesId) {
					itemName = result?.item.Items[episodeIndex].SeriesName;
					episodeTitle = `S${result?.item.Items[episodeIndex].ParentIndexNumber ?? 0}:E${
						result?.item.Items[episodeIndex].IndexNumber ?? 0
					} ${result?.item.Items[episodeIndex].Name}`;
				}
				// Subtitle
				const subtitle = getSubtitle(
					currentSubTrack,
					result?.mediaSource.MediaSources?.[0].MediaStreams,
				);
				// URL generation
				const urlOptions = {
					Static: true,
					tag: result?.mediaSource.MediaSources?.[0].ETag,
					mediaSourceId: result?.mediaSource.MediaSources?.[0].Id,
					deviceId: api?.deviceInfo.id,
					api_key: api?.accessToken,
				};
				const urlParams = new URLSearchParams(urlOptions).toString();
				let playbackUrl = `${api?.basePath}/Videos/${result?.mediaSource.MediaSources?.[0].Id}/stream.${result?.mediaSource.MediaSources?.[0].Container}?${urlParams}`;
				if (
					result?.mediaSource.MediaSources?.[0].SupportsTranscoding &&
					result?.mediaSource.MediaSources?.[0].TranscodingUrl
				) {
					playbackUrl = `${api.basePath}${result.mediaSource.MediaSources[0].TranscodingUrl}`;
				}

				playItem(
					itemName,
					episodeTitle,
					currentVideoTrack,
					currentAudioTrack,
					result?.mediaSource?.MediaSources?.[0].Container ?? "mkv",
					playbackUrl,
					userId,
					item.UserData?.PlaybackPositionTicks,
					item.RunTimeTicks,
					item,
					queue,
					episodeIndex,
					result?.mediaSource.MediaSources?.[0]?.Id,
					result?.mediaSource.PlaySessionId,
					subtitle,
					result?.introInfo,
				);
				navigate({ to: "/player" });
			}
		},
		onSettled: () => {
			setPlaybackDataLoading(false);
		},
		onError: (error) => {
			console.error(error);
			enqueueSnackbar(`${error}`, {
				variant: "error",
			});
		},
	});
	const handleClick = (e) => {
		e.stopPropagation();
		itemQuery.mutate();
	};
	if (iconOnly) {
		return (
			<Fab
				color="primary"
				aria-label="Play"
				className={className}
				onClick={handleClick}
				sx={sx}
				size={size}
				{...buttonProps}
			>
				<div
					className="material-symbols-rounded em-4 fill"
					style={{
						fontSize: "3em",
					}}
				>
					play_arrow
				</div>
			</Fab>
		);
	}
	return (
		<div
			className="play-button"
			style={{
				width: "auto",
				position: "relative",
			}}
		>
			<Button
				className={className ?? "play-button"}
				variant="contained"
				onClick={handleClick}
				startIcon={
					<div
						className="material-symbols-rounded fill"
						style={{
							zIndex: 1,
							fontSize: "2em",
						}}
					>
						play_arrow
					</div>
				}
				{...buttonProps}
				sx={{
					position: "relative",
					overflow: "hidden",
				}}
				color="white"
				size={size}
			>
				{itemUserData.PlaybackPositionTicks
					? "Continue Watching"
					: item?.Type === "MusicAlbum" ||
							item?.Type === "Audio" ||
							item?.Type === "AudioBook" ||
							item?.Type === "Playlist" ||
							audio
						? "Play Now"
						: "Watch Now"}
				<LinearProgress
					variant="determinate"
					value={
						100 > itemUserData.PlayedPercentage > 0
							? itemUserData.PlayedPercentage
							: 0
					}
					sx={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						height: "100%",
						background: "transparent",
						opacity: 0.2,
						zIndex: 0,
						mixBlendMode: "difference",
					}}
					color="white"
				/>
			</Button>
			{itemUserData.PlaybackPositionTicks > 0 && (
				<Typography
					sx={{
						opacity: 0.8,
						position: "absolute",
						bottom: "-1.8em",
						left: "50%",
						transform: "translate(-50%)",
					}}
					variant="caption"
				>
					{getRuntimeCompact(
						item.RunTimeTicks - itemUserData.PlaybackPositionTicks,
					)}{" "}
					left
				</Typography>
			)}
		</div>
	);
};

export default PlayButton;
